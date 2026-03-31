import re

with open('../database/schema_v2.sql', 'r') as f:
    sql = f.read()

# regex to find CREATE TABLE (table_name) ( ... )
tables = re.findall(r'CREATE TABLE ([a-zA-Z0-9_]+) \((.*?)\);', sql, re.DOTALL)

alter_statements = []
for table_name, columns_str in tables:
    # ignore constraints for now, just extract column definitions
    lines = columns_str.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('UNIQUE') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY') or line.startswith('CHECK'):
            continue
        # get column name
        parts = line.split()
        if not parts:
            continue
        col_name = parts[0]
        if col_name.upper() in ['UNIQUE', 'PRIMARY', 'FOREIGN', 'CHECK', 'CONSTRAINT']:
            continue
        
        # fix the auth.users reference inside python if needed
        line_clean = line.rstrip(',')
        if "REFERENCES users(id)" in line_clean:
            line_clean = line_clean.replace("REFERENCES users(id)", "REFERENCES auth.users(id)")
            
        stmt = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {line_clean};"
        alter_statements.append(stmt)

with open('../database/migration_master.sql', 'w') as f:
    f.write("-- ONE PATCH TO FIX THEM ALL\n")
    # first, create any missing tables to avoid alter table error!
    for table_name, columns_str in tables:
      col_fixed = columns_str.replace("REFERENCES users(id)", "REFERENCES auth.users(id)")
      f.write(f"CREATE TABLE IF NOT EXISTS {table_name} ({col_fixed});\n")

    for stmt in alter_statements:
        f.write(stmt + "\n")
