import { NextResponse } from 'next/server'

const GOOGLE_KEY = process.env.GOOGLE_STREETVIEW_KEY

export async function GET(request) {
  // Require auth to prevent credit abuse
  const authHeader = request.headers.get('cookie') || ''
  if (!authHeader.includes('sb-')) {
    // Allow if referer is from our own domain (browser requests from lead detail page)
    const referer = request.headers.get('referer') || ''
    if (!referer.includes('builderleads') && !referer.includes('vercel.app') && !referer.includes('localhost')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const heading = searchParams.get('heading') || ''

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  if (!GOOGLE_KEY) {
    return NextResponse.json({ error: 'Street View not configured' }, { status: 500 })
  }

  // Check if Street View is available at this location
  const metaResp = await fetch(
    `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_KEY}`
  )
  const meta = await metaResp.json()

  if (meta.status !== 'OK') {
    return NextResponse.json({ available: false, status: meta.status })
  }

  // Build the image URL
  const params = new URLSearchParams({
    size: '800x400',
    location: `${lat},${lng}`,
    fov: '100',
    pitch: '5',
    key: GOOGLE_KEY,
  })
  if (heading) params.set('heading', heading)

  // Fetch the image and proxy it
  const imageResp = await fetch(`https://maps.googleapis.com/maps/api/streetview?${params}`)
  const imageBuffer = await imageResp.arrayBuffer()

  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
