import os
import re

files = [
    r"d:\05 Tool\02rpProject\rpProject\src\prototypes\site-management\index.tsx",
    r"d:\05 Tool\02rpProject\rpProject\src\prototypes\park-point-management\index.tsx",
    r"d:\05 Tool\02rpProject\rpProject\src\prototypes\terminal-management\index.tsx",
    r"d:\05 Tool\02rpProject\rpProject\src\prototypes\address-management\index.tsx",
    r"d:\05 Tool\02rpProject\rpProject\src\prototypes\vehicle-management\index.tsx",
]

pages = {
    "site-management": "站点查询",
    "park-point-management": "停靠点查询",
    "terminal-management": "装卸端管理",
    "address-management": "地址查询",
    "vehicle-management": "车辆管理",
}

for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()

    # Determine current page name
    page_name = ""
    for k, v in pages.items():
        if k in file:
            page_name = v
            break

    # We want to replace everything from {/* Header */} to the next </div> that closes page-header.
    # A simple regex for this structure (since they are very standard):
    pattern = re.compile(r'(\s*)\{\/\* Header \*/\}\s*<div className="page-header">.*?</div>\s*</div>', re.DOTALL)
    
    # Let's ensure we find it
    match = pattern.search(content)
    if not match:
        print(f"Header not found in {file}")
        continue

    indent = match.group(1)

    new_header = f"""{indent}{{/* Header - 统一使用工作台一级菜单 */}}
{indent}<header className="h-16 border-b border-cyan-900/50 bg-[#0f172a]/80 backdrop-blur flex items-center px-6 justify-between shrink-0" style={{{{ borderBottom: '1px solid rgba(22, 78, 99, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '64px' }}}}>
{indent}  <div className="flex items-center space-x-3" style={{{{ display: 'flex', alignItems: 'center', gap: '12px' }}}}>
{indent}    <div className="w-8 h-8 rounded-full border border-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,255,0.3)]" style={{{{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,255,255,0.3)' }}}}>
{indent}      <Monitor className="w-4 h-4 text-cyan-400" size={{16}} color="#22d3ee" />
{indent}    </div>
{indent}    <h1 className="text-xl font-bold text-white tracking-wider" style={{{{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.05em', margin: 0 }}}}>智慧燃料集控中心</h1>
{indent}  </div>
{indent}
{indent}  <nav className="flex space-x-1" style={{{{ display: 'flex', gap: '4px' }}}}>
{indent}    {{['主界面', '采样机', '汽车衡', '气动传输', '自动制样'].map(item => (
{indent}      <button
{indent}        key={{item}}
{indent}        className={{`px-6 py-2 text-sm transform skew-x-[-15deg] transition-colors ${{
{indent}          item === '主界面' 
{indent}            ? 'bg-cyan-900/60 border-b-2 border-cyan-400 text-cyan-300' 
{indent}            : 'hover:bg-cyan-900/30 text-gray-400'
{indent}        }}`}}
{indent}        style={{item === '主界面' 
{indent}          ? {{ padding: '8px 24px', fontSize: '14px', transform: 'skewX(-15deg)', backgroundColor: 'rgba(22, 78, 99, 0.6)', borderBottom: '2px solid #22d3ee', color: '#67e8f9', border: 'none', cursor: 'pointer' }}
{indent}          : {{ padding: '8px 24px', fontSize: '14px', transform: 'skewX(-15deg)', backgroundColor: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer' }}
{indent}        }}
{indent}      >
{indent}        <div className="transform skew-x-[15deg]" style={{{{ transform: 'skewX(15deg)' }}}}>{{item}}</div>
{indent}      </button>
{indent}    ))}}
{indent}  </nav>
{indent}
{indent}  <div className="flex items-center space-x-4" style={{{{ display: 'flex', alignItems: 'center', gap: '16px' }}}}>
{indent}    <div className="text-sm text-cyan-400" style={{{{ fontSize: '14px', color: '#22d3ee' }}}}>2023-10-24 10:05:32</div>
{indent}    <button className="p-2 hover:bg-cyan-900/30 rounded-full text-cyan-400 transition-colors" style={{{{ padding: '8px', borderRadius: '50%', color: '#22d3ee', background: 'transparent', border: 'none', cursor: 'pointer' }}}}>
{indent}      <Power className="w-5 h-5" size={{20}} />
{indent}    </button>
{indent}  </div>
{indent}</header>
{indent}
{indent}{{/* Level 2 Menu */}}
{indent}<div className="h-12 bg-[#0f172a]/50 border-b border-cyan-900/30 flex items-center px-6 space-x-8 shrink-0" style={{{{ height: '48px', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px solid rgba(22, 78, 99, 0.3)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '32px', marginBottom: '24px' }}}}>
{indent}  {{['站点查询', '停靠点查询', '装卸端管理', '地址查询', '车辆管理'].map(item => {{
{indent}    const isActive = item === '{page_name}';
{indent}    return (
{indent}      <button
{indent}        key={{item}}
{indent}        className={{`text-sm py-3 relative transition-colors ${{
{indent}          isActive ? 'text-cyan-400 font-medium' : 'text-gray-400 hover:text-gray-200'
{indent}        }}`}}
{indent}        style={{{{ 
{indent}          fontSize: '14px', 
{indent}          padding: '12px 0', 
{indent}          position: 'relative', 
{indent}          color: isActive ? '#22d3ee' : '#9ca3af', 
{indent}          fontWeight: isActive ? 500 : 'normal',
{indent}          background: 'transparent',
{indent}          border: 'none',
{indent}          cursor: 'pointer'
{indent}        }}}}
{indent}      >
{indent}        {{item}}
{indent}        {{isActive && (
{indent}          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.8)]" style={{{{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', backgroundColor: '#22d3ee', boxShadow: '0 0 8px rgba(0,255,255,0.8)' }}}} />
{indent}        )}}
{indent}      </button>
{indent}    );
{indent}  }})}}
{indent}</div>"""

    new_content = content[:match.start()] + new_header + content[match.end():]
    
    # We also need to add Monitor and Power imports from lucide-react if they are missing
    if "import { Monitor, Power }" not in new_content and "from 'lucide-react'" not in new_content:
        import_str = "import { Monitor, Power } from 'lucide-react';\n"
        # Find the last import
        import_match = list(re.finditer(r"import\s+.*?;", new_content, re.DOTALL))
        if import_match:
            last_import = import_match[-1]
            new_content = new_content[:last_import.end()] + "\n" + import_str + new_content[last_import.end():]

    with open(file, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"Updated {file}")
