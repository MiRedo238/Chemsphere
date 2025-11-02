import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting expiration check...')

    // Get admin users for email notifications
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('email, username')
      .eq('role', 'admin')
      .eq('active', true)
      .eq('verified', true)

    if (adminError) {
      console.error('Admin users fetch error:', adminError)
      throw adminError
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found for notifications')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No admin users found for notifications' 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${adminUsers.length} admin users for notifications`)

    // Get current date and 90 days from now
    const now = new Date()
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    
    // Format dates for SQL comparison
    const nowStr = now.toISOString().split('T')[0]
    const futureStr = ninetyDaysFromNow.toISOString().split('T')[0]

    // Get chemicals expiring within 90 days
    const { data: chemicals, error } = await supabase
      .from('chemicals')
      .select('*')
      .gte('expiration_date', nowStr)  // Not yet expired
      .lte('expiration_date', futureStr)  // Within 90 days

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log(`Found ${chemicals.length} chemicals nearing expiration`)

    // Process each chemical
    const notifications = []
    for (const chemical of chemicals) {
      const daysUntilExpiry = Math.ceil(
        (new Date(chemical.expiration_date) - now) / (1000 * 60 * 60 * 24)
      )

      // Create notification object
      const notification = {
        chemical_id: chemical.id,
        chemical_name: chemical.name,
        batch_number: chemical.batch_number,
        expiration_date: chemical.expiration_date,
        days_until_expiry: daysUntilExpiry,
        location: chemical.location,
        current_quantity: chemical.current_quantity
      }

      notifications.push(notification)
    }

    if (notifications.length > 0) {
      for (const admin of adminUsers) {
        await sendConsolidatedExpirationEmail(notifications, admin)
      }
    }

    console.log(`Processed ${notifications.length} notifications`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: notifications.length,
        notifications: notifications,
        admin_count: adminUsers.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function sendConsolidatedExpirationEmail(notifications, admin) {
  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    
    // Generate HTML for all chemicals
    const chemicalsList = notifications.map(notification => `
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 6px; margin: 12px 0;">
        <h4 style="margin-top: 0; color: #991b1b;">${notification.chemical_name}</h4>
        <p><strong>Batch:</strong> ${notification.batch_number}</p>
        <p><strong>Location:</strong> ${notification.location}</p>
        <p><strong>Current Quantity:</strong> ${notification.current_quantity}</p>
        <p><strong>Expires:</strong> ${notification.expiration_date}</p>
        <p><strong>Days Remaining:</strong> <span style="color: ${notification.days_until_expiry <= 7 ? '#dc2626' : '#ea580c'}; font-weight: bold;">${notification.days_until_expiry}</span></p>
      </div>
    `).join('')

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Chemical Expiration Alert</h2>
        
        <p>Dear ${admin.username},</p>
        
        <p>You have <strong>${notifications.length}</strong> chemical${notifications.length > 1 ? 's' : ''} that will expire within the next 90 days:</p>
        
        ${chemicalsList}
        
        <p style="color: #dc2626; font-weight: bold; margin-top: 20px;">Please take appropriate action to handle these expiring chemicals.</p>
        
        <p>Best regards,<br>Chemsphere Alert System</p>
      </div>
    `

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: admin.email,
      subject: `🚨 Chemical Expiration Alert: ${notifications.length} chemical${notifications.length > 1 ? 's' : ''} expiring`,
      html: emailBody
    })

    if (error) {
      console.error('Email sending error:', error)
      throw error
    }

    console.log(`Consolidated email sent successfully to ${admin.username} (${admin.email}) for ${notifications.length} chemicals`)
    console.log('Email ID:', data?.id)
    
  } catch (error) {
    console.error(`Failed to send consolidated email to ${admin.username}:`, error)
  }
}