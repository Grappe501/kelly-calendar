# Error Handling Protocol

`AppError` hierarchy → `toSafeErrorBody` with `requestId`. Production omits stacks. APIs use `jsonSafeError`.
