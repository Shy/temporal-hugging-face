# @@@SNIPSTART python-project-template-run-worker
import asyncio
import sys
import logging
from temporalio.client import Client
from temporalio.worker import Worker

from activities import ask_question
from workflows import askQuestion
from model_manager import model_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    # Initialize models before starting the worker
    logger.info("Starting worker initialization...")
    try:
        await model_manager.initialize_models()
        logger.info("Models initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize models: {e}")
        sys.exit(1)

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
