// Curated Tbilisi walking/running destinations.
// Bilingual content lives here (proper nouns + blurbs) so the component
// only needs i18n keys for generic labels.

export type ParkActivity = 'walk' | 'run' | 'both'

export interface TbilisiPark {
  name: string
  nameGe: string
  blurb: string
  blurbGe: string
  activity: ParkActivity
  /** True when the route stays mostly paved/sheltered — surfaced on rainy days. */
  rainFriendly: boolean
}

export const TBILISI_PARKS: TbilisiPark[] = [
  {
    name: 'Vake Park',
    nameGe: 'ვაკის პარკი',
    blurb: 'Wide shaded avenues and a long stair climb for intervals.',
    blurbGe: 'ფართო ჩრდილიანი ხეივნები და გრძელი კიბე ინტერვალებისთვის.',
    activity: 'both',
    rainFriendly: true,
  },
  {
    name: 'Rike Park',
    nameGe: 'რიყის პარკი',
    blurb: 'Flat riverside paved loop by the Mtkvari — easy steady pace.',
    blurbGe: 'ბრტყელი მოასფალტებული მარშრუტი მტკვრის პირას — მშვიდი ტემპი.',
    activity: 'walk',
    rainFriendly: true,
  },
  {
    name: 'Lisi Lake',
    nameGe: 'ლისის ტბა',
    blurb: 'A scenic ~5 km lakeside trail — perfect for a longer run.',
    blurbGe: 'ულამაზესი ~5 კმ ბილიკი ტბის გარშემო — გრძელი სირბილისთვის.',
    activity: 'run',
    rainFriendly: false,
  },
  {
    name: 'Saburtalo Central Park',
    nameGe: 'საბურთალოს ცენტრალური პარკი',
    blurb: 'Compact neighbourhood loops with good lighting and benches.',
    blurbGe: 'კომპაქტური მარშრუტები კარგი განათებითა და სკამებით.',
    activity: 'walk',
    rainFriendly: true,
  },
]
