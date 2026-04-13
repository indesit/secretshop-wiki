import fs from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import path from 'path';

const files = globSync('docs/**/*.md', { ignore: 'docs/templates/**' });

const ownerMap = {
  'company': 'founders',
  'hq': 'operations',
  'stores': 'retail',
  'returns-and-warranty': 'support',
  'anton': 'founders',
  'Anton': 'founders'
};

const validOwners = new Set([
  'founders', 'operations', 'retail', 'sales', 'cash', 'hr', 
  'marketing', 'loyalty', 'crm', 'analytics', 'product', 
  'finance', 'support', 'it'
]);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.startsWith('---')) continue;
  
  let parsed;
  try {
    parsed = matter(content);
  } catch(e) { continue; }
  
  let changed = false;
  
  // 1. Update owner
  if (parsed.data.owner) {
    let oldOwner = parsed.data.owner;
    if (ownerMap[oldOwner]) {
      parsed.data.owner = ownerMap[oldOwner];
      changed = true;
    } else if (!validOwners.has(oldOwner) && oldOwner !== 'TODO') {
      parsed.data.owner = 'TODO';
      changed = true;
    }
  }

  // 2. Update status
  if (parsed.data.status === 'active') {
    parsed.data.status = 'approved';
    changed = true;
  }

  // 3. Add canonical_path if missing
  if (!parsed.data.canonical_path) {
    parsed.data.canonical_path = file;
    changed = true;
  } else if (parsed.data.canonical_path.startsWith('wiki/')) {
    parsed.data.canonical_path = parsed.data.canonical_path.replace(/^wiki\//, 'docs/');
    changed = true;
  }

  // 4. Update related_documents format
  if (Array.isArray(parsed.data.related_documents)) {
    parsed.data.related_documents = parsed.data.related_documents.map(doc => {
      if (typeof doc !== 'string') return doc;
      if (!doc.startsWith('/')) {
        changed = true;
        if (doc.includes('/')) return '/' + doc.replace(/^\//, '');
        return doc;
      }
      return doc;
    });
  }

  if (changed) {
    // stringify back
    const newContent = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
}
