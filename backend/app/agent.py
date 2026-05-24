import json
import re
from typing import Dict, Any, List
from app.config import settings

# Attempt to import LangChain modules
try:
    from langchain.prompts import PromptTemplate
    from langchain.chains import LLMChain
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_openai import ChatOpenAI
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False

# Core Web Vitals targets for compliance audit
COMPLIANCE_RULES = {
    "lcp": {
        "green": 2500,  # <= 2.5s
        "amber": 4000,  # <= 4.0s
        "description": "Largest Contentful Paint measures loading performance. A good LCP is 2.5 seconds or less."
    },
    "cls": {
        "green": 0.10,  # <= 0.1
        "amber": 0.25,  # <= 0.25
        "description": "Cumulative Layout Shift measures visual stability. A good CLS is 0.1 or less."
    },
    "fid": {
        "green": 100,   # <= 100ms
        "amber": 300,   # <= 300ms
        "description": "First Input Delay measures page interactivity. A good FID is 100 milliseconds or less."
    }
}

class CompliancePerformanceAgent:
    def __init__(self):
        self.llm = None
        self.provider = None
        
        # Configure the LangChain LLM if credentials are present
        if HAS_LANGCHAIN:
            if settings.GEMINI_API_KEY:
                try:
                    self.llm = ChatGoogleGenerativeAI(
                        model="gemini-1.5-flash",
                        google_api_key=settings.GEMINI_API_KEY,
                        temperature=0.2
                    )
                    self.provider = "gemini"
                except Exception as e:
                    print(f"Failed to initialize Gemini LLM: {e}")
            elif settings.OPENAI_API_KEY:
                try:
                    self.llm = ChatOpenAI(
                        model="gpt-4-turbo",
                        openai_api_key=settings.OPENAI_API_KEY,
                        temperature=0.2
                    )
                    self.provider = "openai"
                except Exception as e:
                    print(f"Failed to initialize OpenAI LLM: {e}")

    def audit_code_snippet(self, code: str, filename: str = "Component.jsx") -> Dict[str, Any]:
        """
        Audits a code snippet for performance regressions, Core Web Vitals impact, and accessibility compliance.
        """
        if self.llm:
            try:
                return self._run_llm_audit(code, filename)
            except Exception as e:
                print(f"LLM Audit failed, falling back to static analysis: {e}")
                return self._run_static_audit(code, filename)
        else:
            return self._run_static_audit(code, filename)

    def _run_llm_audit(self, code: str, filename: str) -> Dict[str, Any]:
        """
        Runs the audit using LangChain LLM.
        """
        prompt_template = """
You are a Lead Software Architect and Web Performance compliance expert. Your task is to audit the following frontend code snippet for Core Web Vitals regressions (LCP, CLS, FID/INP), render-blocking resources, layout shifts, or bundle size bloat.

File: {filename}
Code:
```javascript
{code}
```

Analyze the code and output a JSON object containing the audit results.
Your response MUST be valid JSON only. Do not wrap it in markdown code blocks, do not include any other conversational text.

The JSON schema must be:
{{
  "score": 0-100, // Overall performance compliance score
  "risk_level": "GREEN" | "AMBER" | "RED", // Risk level based on score (GREEN: >=90, AMBER: 60-89, RED: <60)
  "issues": [
    {{
      "title": "Short title describing the issue",
      "impact": "High" | "Medium" | "Low",
      "category": "LCP" | "CLS" | "FID" | "Bundle Size" | "Blocking Resource",
      "description": "Detailed explanation of why this is a regression and what vitals it impacts."
    }}
  ],
  "code_fixes": [
    {{
      "file": "{filename}",
      "description": "Explanation of the fix",
      "original_code": "exact block of original code to replace",
      "replacement_code": "exact block of replacement code containing the optimization"
    }}
  ]
}}
"""
        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["code", "filename"]
        )
        
        # Combine prompt and LLM run
        chain = prompt | self.llm
        response = chain.invoke({"code": code, "filename": filename})
        
        # Clean response and parse JSON
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        return json.loads(content)

    def _run_static_audit(self, code: str, filename: str) -> Dict[str, Any]:
        """
        A rule-based static analyzer fallback that scans the code for performance anti-patterns.
        Guarantees that an evaluation audit is always generated correctly.
        """
        issues = []
        code_fixes = []
        score = 100

        # Anti-pattern 1: Missing width/height or lazy loading on images
        # Scans for <img> tags in React/HTML
        img_matches = re.findall(r'<img\s+([^>]*?)>', code)
        for idx, attrs in enumerate(img_matches):
            has_dimensions = 'width' in attrs and 'height' in attrs
            has_lazy = 'loading="lazy"' in attrs or "loading='lazy'" in attrs
            
            if not has_dimensions:
                score -= 15
                issues.append({
                    "title": f"Image missing explicit dimensions in <img #{idx+1}>",
                    "impact": "High",
                    "category": "CLS",
                    "description": "Images without explicit width and height properties cause cumulative layout shifts (CLS) when they load asynchronously, displacing page content."
                })
                
                # Propose code fix
                original_img = f"<img {attrs}>"
                if "src=" in attrs:
                    src_match = re.search(r'src=["\'](.*?)["\']', attrs)
                    src_str = f' src="{src_match.group(1)}"' if src_match else ' src="..."'
                    replacement_img = f"<img{src_str} width={{800}} height={{450}} loading=\"lazy\" alt=\"Optimized Image\" />"
                else:
                    replacement_img = f"<img {attrs} width={{800}} height={{450}} loading=\"lazy\" />"

                code_fixes.append({
                    "file": filename,
                    "description": "Provide explicit width, height, and modern lazy loading to stabilize the layout and reduce paint delay.",
                    "original_code": original_img,
                    "replacement_code": replacement_img
                })

            elif not has_lazy:
                score -= 5
                issues.append({
                    "title": f"Offscreen image not lazy-loaded in <img #{idx+1}>",
                    "impact": "Medium",
                    "category": "LCP",
                    "description": "Images that are below the fold loaded without loading=\"lazy\" consume critical bandwidth during initial load, pushing back LCP."
                })

        # Anti-pattern 2: Heavy package imports (like import * or direct lodash)
        heavy_imports = re.findall(r'import\s+\*\s+as\s+(\w+)\s+from\s+[\'"](lodash|moment|ramda)[\'"]', code)
        for name, pkg in heavy_imports:
            score -= 10
            issues.append({
                "title": f"Heavy bundle import of {pkg}",
                "impact": "Medium",
                "category": "Bundle Size",
                "description": f"Importing the entire '{pkg}' library using wildcard ('* as {name}') increases frontend bundle size. This delays scripts download and execution (FID/INP)."
            })
            code_fixes.append({
                "file": filename,
                "description": f"Destructure specific functions from '{pkg}' or import sub-modules directly to allow tree-shaking.",
                "original_code": f"import * as {name} from '{pkg}'",
                "replacement_code": f"import { '{ debounce }' } from '{pkg}' // Example of tree-shaked import"
            })

        # Anti-pattern 3: Synchronous scripts or stylesheet tags in JS
        sync_scripts = re.findall(r'<script\s+src=[\'"](.*?)[\'"](?!.*(async|defer)).*?>', code)
        if sync_scripts:
            score -= 15
            issues.append({
                "title": "Render-blocking script source detected",
                "impact": "High",
                "category": "Blocking Resource",
                "description": "Synchronous script loading halts HTML parsing and browser rendering, resulting in a sluggish FCP and LCP."
            })
            for src in sync_scripts:
                code_fixes.append({
                    "file": filename,
                    "description": "Add defer or async attribute to allow asynchronous loading without blocking parser.",
                    "original_code": f'<script src="{src}">',
                    "replacement_code": f'<script src="{src}" defer>'
                })

        # Anti-pattern 4: useEffect without cleanup
        if "useEffect(" in code and "return" not in code and "addEventListener" in code:
            score -= 10
            issues.append({
                "title": "Active event listener in useEffect missing cleanup function",
                "impact": "Medium",
                "category": "FID",
                "description": "Event listeners attached in React's useEffect without a cleanup return block result in memory leaks and duplicate triggers, slowing down user interactions."
            })
            code_fixes.append({
                "file": filename,
                "description": "Return an event removal function in the cleanup block of useEffect.",
                "original_code": "useEffect(() => {\n  window.addEventListener('resize', handleResize);\n}, []);",
                "replacement_code": "useEffect(() => {\n  window.addEventListener('resize', handleResize);\n  return () => window.removeEventListener('resize', handleResize);\n}, []);"
            })

        # Adjust score bounds
        score = max(10, min(100, score))
        if score >= 90:
            risk_level = "GREEN"
        elif score >= 60:
            risk_level = "AMBER"
        else:
            risk_level = "RED"

        # If no issues were found, generate a baseline green report
        if not issues:
            issues.append({
                "title": "Fully Compliant Component Structure",
                "impact": "Low",
                "category": "LCP",
                "description": "The component is optimized. It does not trigger layout shifts, has optimized asset queues, and does not block script threading."
            })

        return {
            "score": score,
            "risk_level": risk_level,
            "issues": issues,
            "code_fixes": code_fixes
        }

    def chat_with_agent(self, history: List[Dict[str, str]], query: str) -> str:
        """
        Runs a conversation with the performance auditor agent.
        """
        if self.llm:
            try:
                # Build context from message history
                history_text = ""
                for msg in history:
                    role = "User" if msg["sender"] == "user" else "Assistant"
                    history_text += f"{role}: {msg['content']}\n"
                
                prompt_template = """
You are ComplianceAgent AI, an expert frontend performance engineer. You assist developers with debugging Core Web Vitals regressions, optimizing React components, sizing resources, resolving layout shifts, and fixing JS exceptions.

Converse with the user professionally and provide concrete code examples where appropriate.

Conversation History:
{history}
User: {query}
Assistant:"""
                prompt = PromptTemplate(
                    template=prompt_template,
                    input_variables=["history", "query"]
                )
                chain = prompt | self.llm
                response = chain.invoke({"history": history_text, "query": query})
                return response.content.strip()
            except Exception as e:
                print(f"LangChain chat failed: {e}")
                return self._fallback_chat(query)
        else:
            return self._fallback_chat(query)

    def _fallback_chat(self, query: str) -> str:
        """
        A rule-based conversational agent fallback to support offline audits.
        """
        query_lower = query.lower()
        
        if "cls" in query_lower or "layout shift" in query_lower:
            return (
                "**CLS (Cumulative Layout Shift)** is a Core Web Vital measuring visual stability. Common triggers include:\n\n"
                "1. **Images without dimensions**: Always reserve layout space by declaring `width` and `height` properties or parent Aspect Ratio containers.\n"
                "2. **Dynamic content insertion**: Avoid rendering components asynchronously above existing content without a skeleton placeholder.\n"
                "3. **Web Fonts triggering FOIT/FOUT**: Use CSS `font-display: swap` to render system fallbacks instantly.\n\n"
                "**Suggested Fix Example:**\n"
                "```jsx\n"
                "// Bad:\n"
                "<img src={avatar} />\n\n"
                "// Good:\n"
                "<div style={{ width: '48px', height: '48px', aspectRatio: '1/1' }}>\n"
                "  <img src={avatar} width={48} height={48} loading=\"lazy\" />\n"
                "</div>\n"
                "```"
            )
        elif "lcp" in query_lower or "paint" in query_lower or "slow load" in query_lower:
            return (
                "**LCP (Largest Contentful Paint)** measures the render timing of the largest visible image or text block. Optimizations include:\n\n"
                "1. **Eliminate render-blocking assets**: Load critical scripts using the `defer` or `async` tags.\n"
                "2. **Prioritize loading of LCP images**: Add `fetchpriority=\"high\"` to hero banners or logo files so they load first.\n"
                "3. **Compress resources**: Serve modern formats (WebP/AVIF) and implement responsive source sets (`srcset`).\n"
                "4. **Server response time**: Optimize APIs and use edge content caching (CDN)."
            )
        elif "fid" in query_lower or "inp" in query_lower or "interaction" in query_lower or "lag" in query_lower:
            return (
                "**FID (First Input Delay)** and **INP (Interaction to Next Paint)** measure user interaction lag. To improve these:\n\n"
                "1. **Break up Long Tasks**: If a JavaScript task takes > 50ms, it blocks the main thread. Break it into micro-tasks using `requestIdleCallback` or yield to the browser (`setTimeout(..., 0)`).\n"
                "2. **Bundle optimization**: Remove unused packages. Switch from heavy libraries (e.g. moment) to lightweight alternatives (e.g. dayjs).\n"
                "3. **Worker threads**: Move heavy calculations off the main rendering thread into Web Workers."
            )
        elif "react" in query_lower or "component" in query_lower:
            return (
                "For optimizing **React Components**:\n\n"
                "1. **Prevent unnecessary renders**: Use `React.memo` for static templates and wrap dependency values with `useMemo` and `useCallback`.\n"
                "2. **Lazy load components**: Use `React.lazy` and `Suspense` for heavy components below-the-fold or in routes.\n"
                "3. **Clean up listeners**: Always return a cleanup function in `useEffect` to avoid duplicating intervals and listeners."
            )
        else:
            return (
                "Hello! I am **ComplianceAgent AI**, your performance auditor. I scan telemetry metrics (LCP, CLS, FID) and source code to flag compliance risks (Red/Amber/Green).\n\n"
                "Feel free to ask me:\n"
                "- *'How can I fix high Cumulative Layout Shift (CLS)?'*\n"
                "- *'What causes slow Largest Contentful Paint (LCP) in React?'*\n"
                "- *'How do I optimize render-blocking CSS/JS resources?'*\n\n"
                "You can also upload React or HTML snippets directly in the **AI Code Auditor** tab to generate side-by-side git diff improvements!"
            )
