from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from activities import ask_question


@workflow.defn
class askQuestion:
    @workflow.run
    async def run(self, prompt: str, model: str = "20b") -> str:
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            backoff_coefficient=2.0,
            maximum_attempts=3,
        )
        return await workflow.execute_activity(
            ask_question,
            args=(prompt, model),
            start_to_close_timeout=timedelta(seconds=360),
            retry_policy=retry_policy,
        )
