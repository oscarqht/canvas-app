import re

with open('src/lib/characters.ts', 'r') as f:
    content = f.read()

search_str = """
  // 3. Fetch all raindrops from the "Characters" collection
  const items = await getRaindrops(charactersCollection._id);
"""

replace_str = """
  // 3. Find all sub-collections under "Characters"
  const characterGroups = children.filter(
    (c) => c.parent?.$id === charactersCollection._id
  );

  // 4. Batch fetch all items across all sub-collections using a single search query on collection 0
  const groupIds = characterGroups.map((g) => g._id);
  const searchFilter = JSON.stringify([{ collection: charactersCollection._id }, ...groupIds.map((id) => ({ collection: id }))]);
  const items = await getRaindrops(0, searchFilter);
"""

content = content.replace(search_str.strip(), replace_str.strip())

with open('src/lib/characters.ts', 'w') as f:
    f.write(content)
