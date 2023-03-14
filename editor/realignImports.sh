/bin/bash
# find . -name "*.js" | xargs sed --binary -i `s|''|''|g`
find . -name *.html | xargs sed --binary -i s:'"../examples':'"../node_modules/three/examples':g
find . -name *.js | xargs sed --binary -i s:"from '../../examples":"from '../../node_modules/three/examples":g
