import mdl
import sys
import json
import pprint

mdl_file = sys.argv[1]
parsed = mdl.parseFile(mdl_file)

if parsed:
    (commands, symbols) = parsed
else:
    print("Failed to parse")

wrapper = {
    "symbols": symbols,
    "commands": commands
}

print(json.dumps(wrapper))

# to view what will be returned, remove comment below
#pprint.pprint(wrapper)