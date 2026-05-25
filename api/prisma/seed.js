"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    const password = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'admin@greenpark.com' },
        update: {},
        create: {
            email: 'admin@greenpark.com',
            password,
            firstName: 'Green',
            lastName: 'Park',
            role: 'NETWORK_ADMIN',
            isEmailVerified: true,
            network: {
                create: {
                    name: 'Greenpark Estate',
                    slug: 'greenpark',
                    description: 'A test estate network',
                    currency: 'NGN',
                    country: 'NG',
                },
            },
        },
    });
    console.log(`Seeded user: ${user.email} / password123`);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map