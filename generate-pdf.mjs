import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdFile = join(__dirname, '../Obsidian/Jarvis/Projekte/PhysioFlow/Pflichtenheft-Therapeutin.md');
const pdfFile = join(__dirname, 'PhysioFlow-Pflichtenheft.pdf');

const markdown = readFileSync(mdFile, 'utf-8');

// Simple HTML conversion
let html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
  h1 { color: #1e40af; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
  h2 { color: #1e40af; margin-top: 30px; border-left: 4px solid #2563eb; padding-left: 15px; }
  h3 { color: #3730a3; }
  table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
  th { background-color: #2563eb; color: white; }
  tr:nth-child(even) { background-color: #f8fafc; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
  pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; }
  .checkbox { display: inline-block; width: 15px; height: 15px; border: 2px solid #64748b; border-radius: 3px; margin-right: 8px; }
  .checkbox.checked { background: #2563eb; border-color: #2563eb; }
  blockquote { border-left: 4px solid #f59e0b; padding-left: 15px; color: #64748b; margin: 15px 0; }
  @media print { body { margin: 20px; } h2 { page-break-before: auto; } }
</style>
</head>
<body>
${markdown
  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
  .replace(/^### (.+)$/gm, '<h3>$1</h3>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/^\| (.+) \|$/gm, (match, content) => {
    const cells = content.split(' | ');
    if (cells[0].match(/^[-:]+$/)) return '';
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  })
  .replace(/(<tr>.*<\/tr>)/gs, '')
  .replace(/\|$/gm, '')
  .replace(/\n\n/g, '</p><p>')
  .replace(/^/, '<p>')
  .replace(/$/, '</p>')
}
</body>
</html>`;

writeFileSync('/tmp/pflichtenheft.html', html);
console.log('HTML created at /tmp/pflichtenheft.html');
