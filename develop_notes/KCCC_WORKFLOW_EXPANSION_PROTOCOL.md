# Workflow Expansion Protocol

1. Authenticate + authorize  
2. Preview (`previewWorkflowExpansion`) — never mutates  
3. Detect duplicates  
4. Explicit human apply  
5. Transaction + event version check + audit  

GET routes must never apply workflows.
