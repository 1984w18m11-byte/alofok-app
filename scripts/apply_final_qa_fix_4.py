from pathlib import Path

p=Path('App.js')
app=p.read_text(encoding='utf-8')

# A previous scripted replacement accidentally wrote the two literal characters
# "\\n" between JavaScript statements in showUpdateDialog. Convert that escape
# into an actual source newline so the file remains valid JavaScript.
bad="const storePackage=APP_VARIANT==='paid'?'com.alofok.plus':'com.alofok.trial';\\n    const url="
good="const storePackage=APP_VARIANT==='paid'?'com.alofok.plus':'com.alofok.trial';\n    const url="
if bad in app:
    app=app.replace(bad,good,1)

p.write_text(app,encoding='utf-8')
print('Fourth final QA pass applied: fixed update-dialog source newline.')
