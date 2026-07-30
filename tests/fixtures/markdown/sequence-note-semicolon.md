# Sequence history repair

This prose keeps the host-document line numbers distinct from the embedded diagram lines.

```mermaid
sequenceDiagram
    participant U as User
    participant A as Validator
    participant B as History Store
    U->>A: Submit current history
    A->>B: Read stored history
    B-->>A: Return stored history
    Note over A,B: Existing valid entries must be preserved
    A->>A: Inspect adjacent message pairs
    alt damaged pair
        A->>B: Repair the pair
    else valid pair
        A->>B: Keep the pair unchanged
    end
    Note over B: valid history stays unchanged;<br/>damaged pairs are repaired locally
```
