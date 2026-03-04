import { NextResponse } from 'next/server'
import { BUILTIN_CHOREOGRAPHIES } from '@/lib/choreography-data'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const found = BUILTIN_CHOREOGRAPHIES.find((item) => item.id === params.id)

  if (!found) {
    return NextResponse.json({ error: 'Choreography not found' }, { status: 404 })
  }

  return NextResponse.json(found)
}
