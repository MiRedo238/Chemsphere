import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting expiration check...')

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

      await sendExpirationEmail(notification)
    }

    console.log(`Processed ${notifications.length} notifications`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: notifications.length,
        notifications: notifications 
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

async function sendExpirationEmail(notification) {
  //TODO: Integrate with actual email service  
  const emailBody = `
    🚨 Chemical Expiration Alert
    
    Chemical: ${notification.chemical_name}
    Batch: ${notification.batch_number}
    Location: ${notification.location}
    Current Quantity: ${notification.current_quantity}
    Expires: ${notification.expiration_date}
    Days Remaining: ${notification.days_until_expiry}
    
    Please take appropriate action.
  `

  console.log(`Would send email for ${notification.chemical_name} (${notification.days_until_expiry} days)`)
  
}