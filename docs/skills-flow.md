### Full production flow

```text
USER
 │
 │ enters activity log
 ▼
REACT FRONTEND
 │
 │ POST /api/status-report
 ▼
EXPRESS BACKEND
 │
 │ messages.create(...)
 │
 ├── user activity log
 │
 └── skill_id
       │
       ▼
CLAUDE PLATFORM
 │
 │ loads relevant Skill
 │ reads SKILL.md
 │ applies procedure
 │ generates report
 ▼
EXPRESS BACKEND
 │
 │ extracts text
 ▼
REACT FRONTEND
 │
 ▼
USER SEES REPORT
```