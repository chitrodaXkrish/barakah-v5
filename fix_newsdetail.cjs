const fs = require('fs');
const path = 'src/pages/NewsDetail.tsx';
let c = fs.readFileSync(path, 'utf8');

// Check the actual newline characters
const hasCRLF = c.includes('\r\n');

// Fix: the inner gap-3 div is missing its closing </div> tag
// Pattern: after </div> (the leading-tight div), the next line is {article.published_at && (
// It should have an additional </div> before it to close the gap-3 div

let count = 0;

// Find all occurrences of the broken pattern
// Broken: </div>\n                {article.published_at &&
// Should be: </div>\n                </div>\n                {article.published_at &&

const newline = hasCRLF ? '\r\n' : '\n';
const searchBroken = `                  </div>${newline}                {article.published_at && (`;
const fixedCorrect = `                  </div>${newline}                </div>${newline}                {article.published_at && (`;

if (c.includes(searchBroken)) {
  c = c.split(searchBroken).join(fixedCorrect);
  fs.writeFileSync(path, c, 'utf8');
  console.log('Fixed successfully!');
} else {
  console.log('Exact pattern not found. Trying alternative...');
  // Try without trailing paren
  const alt1 = `                  </div>${newline}                {article.published_at &&`;
  const alt1fix = `                  </div>${newline}                </div>${newline}                {article.published_at &&`;
  if (c.includes(alt1)) {
    c = c.split(alt1).join(alt1fix);
    fs.writeFileSync(path, c, 'utf8');
    console.log('Fixed with alt1!');
  } else {
    console.log('Still not found. Dumping hex around the area...');
    const idx = c.indexOf('{article.published_at &&');
    if (idx > -1) {
      console.log('Found at index:', idx);
      const snippet = c.substring(idx - 100, idx + 200);
      console.log('Context:', JSON.stringify(snippet));
    } else {
      console.log('Cannot find {article.published_at && at all');
    }
  }
}
