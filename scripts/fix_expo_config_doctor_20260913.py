from pathlib import Path
p=Path('app.config.js')
text=p.read_text(encoding='utf-8')
old="const base = require('./app.json').expo;\n\nmodule.exports = () => {"
new="module.exports = ({ config }) => {\n  const base = config;"
if old not in text:
    raise RuntimeError('Expected app.config.js inheritance pattern not found')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')
print('app.config.js now inherits Expo static config through the official config argument.')
