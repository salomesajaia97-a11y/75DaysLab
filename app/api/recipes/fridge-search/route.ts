import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const raw: unknown = (body as Record<string, unknown>)?.ingredients

  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ recipes: [] })
  }

  const terms = (raw as unknown[])
    .map(s => String(s).trim())
    .filter(Boolean)
    .slice(0, 20)
    .map(escapeRegex)

  if (terms.length === 0) return NextResponse.json({ recipes: [] })

  await connectDB()

  const recipes = await Recipe.aggregate([
    {
      $match: {
        $or: terms.map(term => ({
          ingredients: { $elemMatch: { $regex: term, $options: 'i' } },
        })),
      },
    },
    {
      $addFields: {
        matchScore: {
          $add: terms.map(term => ({
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ['$ingredients', []] },
                        as: 'ing',
                        cond: { $regexMatch: { input: '$$ing', regex: term, options: 'i' } },
                      },
                    },
                  },
                  0,
                ],
              },
              1,
              0,
            ],
          })),
        },
      },
    },
    { $sort: { matchScore: -1, scrapedAt: -1 } },
    { $limit: 50 },
    {
      $project: {
        title: 1,
        sourceUrl: 1,
        sourceSite: 1,
        imageUrl: 1,
        calories: 1,
        protein: 1,
        totalTimeMin: 1,
        ingredientCount: 1,
        dietTags: 1,
        matchScore: 1,
      },
    },
  ])

  return NextResponse.json({ recipes })
}
