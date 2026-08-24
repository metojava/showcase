export const fmtMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const CATEGORY_ICONS = [
  ['Beverages', 'FiCoffee'],
  ['Condiments', 'FiDroplet'],
  ['Confections', 'FiGift'],
  ['Dairy Products', 'FiFeather'],
  ['Grains/Cereals', 'FiSun'],
  ['Meat/Poultry', 'FiFlame'],
  ['Produce', 'FiLeaf'],
  ['Seafood', 'FiAnchor'],
]
const ICONS = ['FiCoffee', 'FiBox', 'FiTool', 'FiZap', 'FiHeart', 'FiBookOpen', 'FiHome', 'FiMusic']

export function iconForCategory(name) {
  const hit = CATEGORY_ICONS.find(([n]) => n.toLowerCase() === (name || '').toLowerCase())
  return hit ? hit[1] : ICONS[(name || '').length % ICONS.length]
}
