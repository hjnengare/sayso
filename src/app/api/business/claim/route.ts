import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { EmailService } from '@/app/lib/services/emailService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { business_id, role, phone, email, note } = body;

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    if (!role || !['owner', 'manager'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be "owner" or "manager"' },
        { status: 400 }
      );
    }

    // Check if user already owns this business
    const { data: existingOwner } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .single();

    if (existingOwner) {
      return NextResponse.json(
        { error: 'You already own this business' },
        { status: 400 }
      );
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('business_ownership_requests')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending claim request for this business' },
        { status: 400 }
      );
    }

    // Create ownership request
    const verificationData: Record<string, any> = {};
    if (phone) verificationData.phone = phone;
    if (email) verificationData.email = email;
    if (note) verificationData.notes = note;

    const { data: request, error: requestError } = await supabase
      .from('business_ownership_requests')
      .insert({
        business_id,
        user_id: user.id,
        status: 'pending',
        verification_method: 'manual', // Default to manual for now
        verification_data: {
          ...verificationData,
          role,
        },
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating ownership request:', requestError);
      return NextResponse.json(
        { error: 'Failed to create claim request' },
        { status: 500 }
      );
    }

    // Get business details for email
    const { data: business } = await supabase
      .from('businesses')
      .select('name, category, location')
      .eq('id', business_id)
      .single();

    // Get user email and profile
    const userEmail = user.email || email;
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', user.id)
      .single();

    // Send confirmation email (non-blocking)
    if (userEmail && business) {
      EmailService.sendClaimReceivedEmail({
        recipientEmail: userEmail,
        recipientName: profile?.display_name || profile?.username || undefined,
        businessName: business.name,
        businessCategory: business.category,
        businessLocation: business.location,
      }).catch((error) => {
        // Log but don't fail the request if email fails
        console.error('Failed to send claim received email:', error);
      });
    }

    return NextResponse.json(
      { 
        success: true,
        request: {
          id: request.id,
          business_id: request.business_id,
          status: request.status,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in business claim API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

