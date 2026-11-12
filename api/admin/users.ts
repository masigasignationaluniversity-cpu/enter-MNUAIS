import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createInvitedUser,
  invitationSchema,
  PortalApiError,
  requireActiveAdmin,
  sendApiError,
} from '../_lib/portal-admin';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    await requireActiveAdmin(request);
    const parsed = invitationSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new PortalApiError(parsed.error.issues[0]?.message || 'Check the invitation details and try again.', 400);
    }

    await createInvitedUser(parsed.data, request);
    return response.status(201).json({ message: 'Invitation sent.' });
  } catch (error) {
    return sendApiError(response, error);
  }
}
