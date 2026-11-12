import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createInvitedUser,
  getActiveAdminCount,
  invitationSchema,
  PortalApiError,
  sendApiError,
} from '../_lib/portal-admin';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const configuredEmail = process.env.PORTAL_INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const configuredSecret = process.env.PORTAL_INITIAL_ADMIN_SETUP_SECRET;
  if (!configuredEmail || !configuredSecret || Buffer.byteLength(configuredSecret, 'utf8') < 32) {
    return response.status(503).json({ error: 'Initial administrator setup is not configured yet.' });
  }

  try {
    const body = typeof request.body === 'object' && request.body !== null
      ? request.body as Record<string, unknown>
      : {};
    const suppliedSecret = typeof body.setupSecret === 'string' ? Buffer.from(body.setupSecret, 'utf8') : Buffer.alloc(0);
    const expectedSecret = Buffer.from(configuredSecret, 'utf8');
    if (suppliedSecret.length !== expectedSecret.length || !timingSafeEqual(suppliedSecret, expectedSecret)) {
      throw new PortalApiError('The initial administrator setup code is invalid.', 403);
    }

    const parsed = invitationSchema.safeParse({ ...body, email: configuredEmail, role: 'admin' });
    if (!parsed.success) {
      throw new PortalApiError(parsed.error.issues[0]?.message || 'Check the administrator details and try again.', 400);
    }
    if (await getActiveAdminCount() > 0) {
      throw new PortalApiError('Initial administrator setup is already complete.', 409);
    }

    await createInvitedUser(parsed.data, request);
    return response.status(201).json({ message: 'Initial administrator invitation sent.' });
  } catch (error) {
    return sendApiError(response, error);
  }
}
