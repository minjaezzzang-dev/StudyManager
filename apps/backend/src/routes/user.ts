import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { validateBody } from '../middleware/validation';
import { updateProfileSchema } from './schemas';
import { env } from '../config/env';

export const userRouter = Router();

function getUserClient(authHeader: string | undefined) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader ?? '' } },
  });
}

userRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const supabase = getUserClient(req.headers.authorization);

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ data: profile });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

userRouter.patch('/me', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const supabase = getUserClient(req.headers.authorization);

    const { data, error } = await supabase
      .from('users')
      .update(req.body)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({ data });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});
