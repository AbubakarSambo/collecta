import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class NetworkGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const networkId = request.params.networkId;

    if (!networkId) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Platform admins bypass network check
    if (user.isPlatformAdmin) {
      return true;
    }

    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    if (network.adminId !== user.id) {
      throw new ForbiddenException('You do not have access to this network');
    }

    request.network = network;
    return true;
  }
}
