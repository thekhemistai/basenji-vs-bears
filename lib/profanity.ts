// Simple profanity filter for player names

const PROFANITY_LIST = [
  'fuck', 'shit', 'damn', 'ass', 'bitch', 'bastard', 'dick', 'cock', 'pussy',
  'whore', 'slut', 'nigger', 'nigga', 'fag', 'faggot', 'retard', 'cunt',
  'f4ck', 'sh1t', 'd4mn', 'b1tch', 'd1ck', 'c0ck',
  'kys', 'kill yourself', 'rape', 'nazi', 'hitler',
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0-9]/g, (char) => {
      const map: Record<string, string> = { '0': 'o', '1': 'i', '4': 'a', '3': 'e', '5': 's', '7': 't' }
      return map[char] || char
    })
    .replace(/[^a-z]/g, '')
}

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text)
  for (const word of PROFANITY_LIST) {
    if (normalized.includes(normalize(word))) return true
  }
  return false
}

export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name required' }
  }
  if (name.length > 32) {
    return { valid: false, error: 'Name too long (max 32 chars)' }
  }
  if (containsProfanity(name)) {
    return { valid: false, error: 'Keep it clean please 🧪' }
  }
  const validPattern = /^[a-zA-Z0-9 _\-]+$/
  if (!validPattern.test(name)) {
    return { valid: false, error: 'Only letters, numbers, spaces, - and _ allowed' }
  }
  return { valid: true }
}
