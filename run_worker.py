# @@@SNIPSTART python-project-template-run-worker
import asyncio
import sys
from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.worker import Worker

from activities import ask_question
from workflows import askQuestion


async def main():
    client = await Client.connect("localhost:7233", namespace="default")
    # Run the worker

    worker = Worker(
        client,
        task_queue="question-task-queue",
        workflows=[askQuestion],
        activities=[ask_question],
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
