/bin/bash

# Fix paths of imports
find . -name *.html | xargs sed --binary -i s:'"../examples':'"../node_modules/three/examples':g
find . -name *.js | xargs sed --binary -i s:"from '../../examples":"from '../../node_modules/three/examples":g

# Condense code
find . -name "*.js" | xargs sed -i -e "s@( @(@g"
find . -name "*.js" | xargs sed -i -e "s@ )@)@g"
find . -name "*.js" | xargs sed -i -e "s@function ()@function()@g"
find . -name "*.js" | xargs sed -i -e ':a' -e 'N' -e '$!ba' -e 's/\r\{0,1\}\n\{2,\}/\r\n/g'