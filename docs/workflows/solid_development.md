# SOLID Development Workflow [ID: SOLID-WORKFLOW]

This workflow guides developers and AI agents in writing maintainable, reusable, and small-footprint code, strictly adhering to SOLID principles.

## 1. Planning Phase (MANDATORY)

Before writing *any* code for a new feature or refactor, you must evaluate the existing architecture.

-   **Step 1.1 Search for existing code:** Use `grep_search` or IDE tools to find if similar UI components, hooks, or utilities already exist. Do not reinvent the wheel.
-   **Step 1.2 Identify Responsibilities:** List what the new feature needs to do (e.g., fetch data, handle state, render UI list, render list items).
-   **Step 1.3 Split into Files:** In your `[feature]-plan.md`, explicitly define the file structure.
    -   *Bad*: `BigFeature.tsx` (Handles everything)
    -   *Good*: `FeatureContainer.tsx` (State/Fetch), `FeatureList.tsx` (UI), `useFeatureLogic.ts` (Logic)

## 2. React Component Guidelines

-   **Maximum Size**: Aim for < 250 lines of code per file. If it gets larger, extract parts.
-   **No "Spaghetti" Logic**: Keep `useEffect` and `useState` focused. If you have 5+ `useState` hooks or complex `useEffect` chains, extract them into a `useFeatureName.ts` hook.
-   **Props over Context for small things**: Pass small props down if it's only 1-2 levels.
-   **Composition**: Use the `children` prop. Instead of passing 10 flags to customize a component (`<Card showHeader={true} showFooter={false} />`), compose it (`<Card><CardHeader /><CardContent /></Card>`).

## 3. Refactoring During Development

If an agent or developer touches an existing file and notices it's already a "Spaghetti Code" monster (> 500 lines, mixed responsibilities):
1.  **Stop and Evaluate**: Can you extract the part you are working on into a new, smaller component?
2.  **Boy Scout Rule**: Leave the code cleaner than you found it.

## 4. Verification

When completing a task, verify in your Walkthrough artifact:
-   "Did I duplicate any existing logic?"
-   "Is there any single file I created that handles more than one specific responsibility?"
-   "Are my files reasonably small?"
