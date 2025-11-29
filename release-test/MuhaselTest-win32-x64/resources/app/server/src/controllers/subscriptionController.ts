import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

interface Subscription {
  id: string;
  school_id: string;
  school_name?: string;
  contact_email: string;
  subscription_start: string;
  subscription_end: string;
  amount: number;
  paid: boolean;
  payment_date?: string;
  status: 'active' | 'paused' | 'expired' | 'pending';
  created_at: string;
  updated_at: string;
}

/**
 * Get all subscriptions (admin) or school's subscriptions
 */
export const getSubscriptionsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, school_id } = req.user!;
    
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        schools!inner(name)
      `);
    
    // If not admin, filter by school_id
    if (role !== 'admin') {
      query = query.eq('school_id', school_id);
    }
    
    const { data: subscriptions, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
    
    // Transform data to match frontend expectations
    const transformedSubscriptions = subscriptions?.map(sub => ({
      id: sub.id,
      schoolId: sub.school_id,
      schoolName: sub.schools?.name || 'Unknown School',
      contactEmail: sub.contact_email,
      subscriptionStart: sub.subscription_start,
      subscriptionEnd: sub.subscription_end,
      amount: sub.amount,
      paid: sub.paid,
      paymentDate: sub.payment_date,
      status: sub.status,
      createdAt: sub.created_at
    })) || [];
    
    res.json(transformedSubscriptions);
  } catch (error) {
    console.error('Error in getSubscriptionsHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a subscription by ID
 */
export const getSubscriptionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, school_id } = req.user!;
    
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        schools!inner(name)
      `)
      .eq('id', id)
      .single();
    
    const { data: subscription, error } = await query;
    
    if (error) {
      console.error('Error fetching subscription:', error);
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Check access permissions
    if (role !== 'admin' && subscription.school_id !== school_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Transform data to match frontend expectations
    const transformedSubscription = {
      id: subscription.id,
      schoolId: subscription.school_id,
      schoolName: subscription.schools?.name || 'Unknown School',
      contactEmail: subscription.contact_email,
      subscriptionStart: subscription.subscription_start,
      subscriptionEnd: subscription.subscription_end,
      amount: subscription.amount,
      paid: subscription.paid,
      paymentDate: subscription.payment_date,
      status: subscription.status,
      createdAt: subscription.created_at
    };
    
    res.json(transformedSubscription);
  } catch (error) {
    console.error('Error in getSubscriptionHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new subscription
 */
export const createSubscriptionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      schoolId, 
      contactEmail, 
      subscriptionStart, 
      subscriptionEnd, 
      amount, 
      paid = false,
      paymentDate,
      status = 'pending'
    } = req.body;
    
    // Validate required fields
    if (!schoolId || !contactEmail || !subscriptionStart || !subscriptionEnd || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        school_id: schoolId,
        contact_email: contactEmail,
        subscription_start: subscriptionStart,
        subscription_end: subscriptionEnd,
        amount,
        paid,
        payment_date: paymentDate,
        status
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating subscription:', error);
      return res.status(500).json({ error: 'Failed to create subscription' });
    }
    
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error in createSubscriptionHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing subscription
 */
export const updateSubscriptionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove id from update data if present
    delete updateData.id;
    delete updateData.createdAt;
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating subscription:', error);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error in updateSubscriptionHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a subscription
 */
export const deleteSubscriptionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting subscription:', error);
      return res.status(500).json({ error: 'Failed to delete subscription' });
    }
    
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error in deleteSubscriptionHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark subscription as paid
 */
export const markSubscriptionAsPaidHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentDate } = req.body;
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({
        paid: true,
        payment_date: paymentDate || new Date().toISOString(),
        status: 'active'
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error marking subscription as paid:', error);
      return res.status(500).json({ error: 'Failed to mark subscription as paid' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error in markSubscriptionAsPaidHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Pause a subscription
 */
export const pauseSubscriptionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({ status: 'paused' })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error pausing subscription:', error);
      return res.status(500).json({ error: 'Failed to pause subscription' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error in pauseSubscriptionHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Resume a paused subscription
 */
export const resumeSubscriptionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error resuming subscription:', error);
      return res.status(500).json({ error: 'Failed to resume subscription' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error in resumeSubscriptionHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};