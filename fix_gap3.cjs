const fs = require('fs');
const path = 'src/pages/NewsDetail.tsx';
let c = fs.readFileSync(path, 'utf8');

// The problem: inside the source row, there's:
// <div className="flex items-center gap-3">
//   ... stuff ...
//   </div>  <-- closes leading-tight
//   {article.published_at && (...) } <-- should be outside gap-3, but there's no </div> closing gap-3 before it!
// </div>  <-- this is actually closing justify-between, but it THINKS it's closing gap-3
//
// Fix: insert </div> before {article.published_at &&

// Pattern: </div>\n                {article.published_at && (
// Need to add the closing gap-3 </div> in between

const search = '                  </div>\n                {article.published_at && (';
const replace = '                  </div>\n                </div>\n                {article.published_at && (';

if (c.includes(search)) {
  c = c.replace(search, replace);
  console.log('Fixed: inserted missing </div> to close gap-3 div');
} else {
  // Try with CRLF
  const searchCRLF = '                  </div>\r\n                {article.published_at && (';
  if (c.includes(searchCRLF)) {
    c = c.replace(searchCRLF, '                  </div>\r\n                </div>\r\n                {article.published_at && (');
    console.log('Fixed with CRLF: inserted missing </div> to close gap-3 div');
  } else {
    console.log('Pattern not found. Checking raw context...');
    const idx = c.indexOf('                {article.published_at && (');
    if (idx > -1) {
      const ctx = c.substring(idx - 150, idx + 50);
      console.log('CONTEXT:', JSON.stringify(ctx));
    } else {
      console.log('Cannot find the published_at line');
    }
  }
}

fs.writeFileSync(path, c, 'utf8');
console.log('Saved');
