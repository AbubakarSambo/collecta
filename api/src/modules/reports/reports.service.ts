import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateCollectionReport(networkId: string, months = 6) {
    const results = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      const date = new Date(year, month, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const [collected, outstanding] = await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            networkId,
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.charge.aggregate({
          where: {
            networkId,
            dueDate: { gte: startOfMonth, lte: endOfMonth },
            status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
          },
          _sum: { amount: true },
        }),
      ]);

      results.push({
        month: startOfMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        year: startOfMonth.getFullYear(),
        monthIndex: startOfMonth.getMonth(),
        collected: Number(collected._sum.amount || 0),
        outstanding: Number(outstanding._sum.amount || 0),
      });
    }

    // Collection by fee
    const fees = await this.prisma.fee.findMany({
      where: { networkId, isActive: true },
      select: { id: true, name: true },
    });

    const feeBreakdown = await Promise.all(
      fees.map(async (fee) => {
        const [paid, total] = await Promise.all([
          this.prisma.charge.aggregate({
            where: { networkId, feeId: fee.id, status: 'PAID' },
            _sum: { paidAmount: true },
            _count: true,
          }),
          this.prisma.charge.aggregate({
            where: { networkId, feeId: fee.id },
            _sum: { amount: true },
            _count: true,
          }),
        ]);

        return {
          feeId: fee.id,
          feeName: fee.name,
          paidAmount: Number(paid._sum.paidAmount || 0),
          totalAmount: Number(total._sum.amount || 0),
          paidCount: paid._count,
          totalCount: total._count,
          complianceRate:
            total._count > 0 ? Math.round((paid._count / total._count) * 100) : 0,
        };
      }),
    );

    return { monthlyTrend: results, feeBreakdown };
  }

  async generateMemberComplianceReport(networkId: string) {
    const members = await this.prisma.member.findMany({
      where: { networkId, status: 'ACTIVE' },
      include: {
        charges: {
          select: { id: true, status: true, amount: true, paidAmount: true },
        },
      },
    });

    const report = members.map((member) => {
      const total = member.charges.length;
      const paid = member.charges.filter((c) => c.status === 'PAID').length;
      const overdue = member.charges.filter((c) => c.status === 'OVERDUE').length;
      const pending = member.charges.filter((c) => c.status === 'PENDING').length;
      const compliancePercent = total > 0 ? Math.round((paid / total) * 100) : 100;

      const totalOwed = member.charges.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalPaid = member.charges.reduce((sum, c) => sum + Number(c.paidAmount), 0);

      return {
        memberId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        unit: member.unit,
        chargesTotal: total,
        chargesPaid: paid,
        chargesOverdue: overdue,
        chargesPending: pending,
        compliancePercent,
        totalOwed,
        totalPaid,
        outstanding: totalOwed - totalPaid,
      };
    });

    report.sort((a, b) => a.compliancePercent - b.compliancePercent);

    return report;
  }

  async exportToExcel(networkId: string): Promise<Buffer> {
    const payments = await this.prisma.payment.findMany({
      where: { networkId },
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { firstName: true, lastName: true, email: true, unit: true } },
        charge: { include: { fee: { select: { name: true } } } },
      },
    });

    const rows = payments.map((p) => ({
      Date: p.createdAt.toISOString().split('T')[0],
      Member: `${p.member.firstName} ${p.member.lastName}`,
      Email: p.member.email || '',
      Unit: p.member.unit || '',
      Fee: p.charge.fee?.name || p.charge.description || '',
      Amount: Number(p.amount),
      Method: p.method,
      Reference: p.paystackReference || '',
    }));

    // Simple CSV as bytes
    const header = Object.keys(rows[0] || {}).join(',');
    const csvRows = rows.map((r) => Object.values(r).join(','));
    const csv = [header, ...csvRows].join('\n');

    return Buffer.from(csv, 'utf-8');
  }

  async exportToPdf(networkId: string): Promise<Buffer> {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
    });

    const [report, summary] = await Promise.all([
      this.generateMemberComplianceReport(networkId),
      this.generateCollectionReport(networkId, 1),
    ]);

    return new Promise((resolve, reject) => {
      try {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(20).text('Collecta — Network Report', { align: 'center' });
        doc.fontSize(12).text(network?.name || '', { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleDateString('en-NG')}`, { align: 'center' });
        doc.moveDown(2);

        // Collection Summary
        const monthData = summary.monthlyTrend[0];
        if (monthData) {
          doc.fontSize(14).text('This Month', { underline: true });
          doc.fontSize(11).text(`Collected: NGN ${monthData.collected.toLocaleString()}`);
          doc.text(`Outstanding: NGN ${monthData.outstanding.toLocaleString()}`);
          doc.moveDown();
        }

        // Member Compliance
        doc.fontSize(14).text('Member Compliance', { underline: true });
        doc.moveDown(0.5);

        for (const member of report.slice(0, 30)) {
          doc
            .fontSize(10)
            .text(
              `${member.firstName} ${member.lastName} (${member.unit || 'N/A'}) — ${member.compliancePercent}% compliant — ${member.chargesOverdue} overdue`,
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
