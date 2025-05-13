// This logic manages and displays backend tasks as they occur.
// This is provided to prevent players from getting tired of waiting when
// running slow models.

// Outline goals:
// Provide a queue of tasks. That way, we can always see the latest task in the queue.
// Each task should have some way to figure out when it's done to pop it from the stack.
// The UI should provide some mechanism to display these tasks. I'm not sure if we should display only the top, current task or if we want to display the full queue to the user (may add significant complexity and refactoring work).
// Some tasks may have a proper mechanism to track progress. We should use it if we can.