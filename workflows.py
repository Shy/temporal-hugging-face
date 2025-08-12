# Standard library for time-based operations
from datetime import timedelta

# Temporal workflow framework - orchestrates distributed async operations
from temporalio import workflow
from temporalio.common import RetryPolicy

# Import activities using Temporal's safety mechanism
# This ensures imports work correctly in Temporal's sandboxed environment
with workflow.unsafe.imports_passed_through():
    from activities import ask_question


@workflow.defn  # Temporal decorator - registers this class as a workflow
class askQuestion:
    """
    Temporal workflow for processing AI questions with retry logic.

    Workflows in Temporal are the orchestration layer - they define the
    sequence of activities (actual work) and handle failures, retries,
    timeouts, and other reliability concerns.

    Key features:
    - Automatic retries with exponential backoff
    - Timeout handling for long-running AI inference
    - Deterministic execution (can be replayed for debugging)
    - Distributed execution across multiple workers
    """

    @workflow.run  # Marks this as the main workflow execution method
    async def run(self, prompt: str, model: str = "20b") -> str:
        """
        Execute the question-answering workflow with proper error handling.

        Args:
            prompt: The user's question or input text
            model: Which AI model to use ("20b" or "smolm3-3b")

        Returns:
            str: The AI-generated response

        The workflow handles the reliability aspects while the actual AI
        inference happens in the activity (ask_question).
        """
        # Configure retry behavior for resilient AI inference
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),  # Wait 1s before first retry
            backoff_coefficient=2.0,  # Double wait time between retries (1s, 2s, 4s)
            maximum_attempts=3,  # Give up after 3 attempts total
        )

        # Execute the AI inference activity with timeout and retry protection
        return await workflow.execute_activity(
            ask_question,  # The activity function to call
            args=(prompt, model),  # Arguments to pass to the activity
            start_to_close_timeout=timedelta(seconds=360),  # 6 minute timeout
            retry_policy=retry_policy,  # Apply our retry configuration
        )
