import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface SendWhatsAppOptions {
  to: string;          // phone number with country code e.g. 919876543210
  templateName: string;
  languageCode?: string;
  components?: any[];  // template variable components
}

/**
 * NotificationService — pluggable notification provider.
 * Currently implements WhatsApp Cloud API (Meta).
 * Swap out sendWhatsApp() implementation to change provider.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── WhatsApp: Send bill delivery notification ─────────────────────────────────

  async sendBillDelivery(options: {
    tenantId: string;
    billId: string;
    customerPhone: string;
    customerName?: string;
    billNumber: string;
    grandTotal: string;
    shopName: string;
    pdfUrl?: string;
  }) {
    const { tenantId, billId, customerPhone, billNumber, grandTotal, shopName, pdfUrl } = options;

    const phoneWithCode = customerPhone.startsWith('+')
      ? customerPhone.slice(1)
      : `91${customerPhone}`; // Default to India country code

    // Log as QUEUED first
    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        billId,
        type: 'BILL_DELIVERY',
        recipient: customerPhone,
        channel: 'WHATSAPP',
        status: 'QUEUED',
      },
    });

    try {
      const accessToken = this.configService.get<string>('whatsapp.accessToken');
      const phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId');

      if (!accessToken || !phoneNumberId || accessToken === '') {
        this.logger.warn('WhatsApp not configured — skipping notification');
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: 'FAILED', errorMsg: 'WhatsApp not configured' },
        });
        return;
      }

      // Build template message
      // Template: bill_delivery with variables: {{1}} shopName, {{2}} billNumber, {{3}} amount, {{4}} pdfUrl
      const payload = {
        messaging_product: 'whatsapp',
        to: phoneWithCode,
        type: 'template',
        template: {
          name: 'bill_delivery',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: shopName },
                { type: 'text', text: billNumber },
                { type: 'text', text: `₹${grandTotal}` },
              ],
            },
            ...(pdfUrl
              ? [
                  {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: pdfUrl }],
                  },
                ]
              : []),
          ],
        },
      };

      const response = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json() as any;

      if (!response.ok) {
        throw new Error(result.error?.message ?? 'WhatsApp API error');
      }

      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          messageId: result.messages?.[0]?.id,
          payload: JSON.stringify(payload),
          sentAt: new Date(),
        },
      });

      this.logger.log(`WhatsApp bill sent to ${customerPhone} | Bill: ${billNumber}`);
    } catch (error: any) {
      this.logger.error(`WhatsApp send failed: ${error.message}`, error.stack);
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMsg: error.message },
      });
    }
  }

  // ── WhatsApp: Low stock alert to shop owner ───────────────────────────────────

  async sendLowStockAlert(tenantId: string, ownerPhone: string, items: Array<{ name: string; currentStock: number; unit: string }>) {
    const itemList = items
      .slice(0, 5) // Limit to 5 items in one message
      .map((i) => `• ${i.name}: ${i.currentStock} ${i.unit}`)
      .join('\n');

    this.logger.log(`Low stock alert → ${ownerPhone}: ${items.length} items`);
    // In production, send WhatsApp message with itemList
    // Logged for now
    await this.prisma.notificationLog.create({
      data: {
        tenantId,
        type: 'LOW_STOCK',
        recipient: ownerPhone,
        channel: 'WHATSAPP',
        status: 'QUEUED',
        payload: JSON.stringify({ items: itemList }),
      },
    });
  }

  // ── Subscription renewal reminder ────────────────────────────────────────────

  async sendSubscriptionReminder(tenantId: string, ownerPhone: string, daysLeft: number, planTier: string) {
    this.logger.log(`Subscription reminder → ${ownerPhone}: ${daysLeft} days left on ${planTier}`);
    await this.prisma.notificationLog.create({
      data: {
        tenantId,
        type: 'SUBSCRIPTION_REMINDER',
        recipient: ownerPhone,
        channel: 'WHATSAPP',
        status: 'QUEUED',
        payload: JSON.stringify({ daysLeft, planTier }),
      },
    });
  }

  // ── Query notification logs from PostgreSQL ───────────────────────────────────

  async getLogs(tenantId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationLog.count({ where: { tenantId } }),
    ]);

    return { logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
