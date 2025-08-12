# Temporal AI Model Question Planetarium

This is an example implementation of running multiple AI models using Temporal activities and workers. Our page uses WebSockets to communicate updates back and forth between our flask server and client browser. By leveraging Temporal we get automatic job queuing and execution in addition to retries, timeout management, question status tracking and more.

The application supports two AI models:

- **SmolLM3-3B**: Local Hugging Face model for fast, lightweight inference
- **gpt-oss-20b**: Via Ollama integration for alternative model responses

![Screenshot of running application](images/ScreenshotTop.png)

### How this project works:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Flask App     │    │  Temporal       │    │  Worker         │
│                 │◄──►│  Server         │◄──►│  (AI Models)    │
│                 │    │                 │    │                 │
│ • Web Interface │    │ • Workflow      │    │ • SmolLM3-3B    │
│ • Model Selection│   │   Queue         │    │ • gpt-oss-20b (Ollama)│
│ • WebSockets    │    │ • Job Management│    │ • Inference     │
│ • Status Updates│    │ • Retry Logic   │    │ • Model Routing │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- This project has 3 major components that communicate with each other.
  - The flask app manages our frontend with model selection, pushes out updates to a browser using WebSockets, and creates new workflows to be coordinated by our temporal server.
  - The Temporal server assigns work to our worker, manages the queue, handles retries and more.
  - Our worker executes the selected AI model (SmolLM3-3B via transformers or gpt-oss-20b via Ollama) and returns the results of our questions.

The specific files include:

- **Flask Application** ([`app.py`](app.py)): Web server handling HTTP requests and WebSockets connections
- **Temporal Workflows** ([`workflows.py`](workflows.py)): Defines the workflow structure with retry policies.
- **Activities** ([`activities.py`](activities.py)): Handles the actual AI model inference logic with routing between SmolLM3-3B and gpt-oss-20b
- **Worker** ([`run_worker.py`](run_worker.py)): Temporal worker that processes queued workflows
- **Frontend** (`templates/`, `static/`,): Frontend that leverages the [orbit CSS framework](https://github.com/zumerlab/orbit) to create the circular layout and [client-side JavaScript](static/app.js) to communicated with the flask server using WebSockets to update the page as information is returned from our worker.

# Getting started

### Requirements

To deploy this project you'll need the following installed on your system:

- [Temporal CLI](https://temporal.io/setup/install-temporal-cli)
- [Python 3](https://github.com/pyenv/pyenv)
- [Ollama](https://ollama.ai/) (for gpt-oss-20b model support)

Given that we're downloading a hugging face model and executing it local the better CPU and memory you have, the faster it'll perform. On my M4, each question takes me about 10ish seconds to generate a response.

### Setup

- Clone this repository.
- Create a virtual environment and install the dependencies from [requirements.txt](requirements.txt).
  - This project was built using python 3.13.5 so default to that version if you encounter any issues.
- Install and configure Ollama for gpt-oss-20b support:
  - Install Ollama from [ollama.ai](https://ollama.ai/)
  - Pull the gpt-oss model: `ollama pull gpt-oss:20b`. This is a 13gb model so expect it to take a bit of time.
- Start a local temporal server.
  - `temporal server start-dev`
- Create at least one temporal worker.
  - `python run_worker.py`
- Start the flask server.
  - `python app.py`

![Screenshot of terminal running the above processes](images/Terminal.png)

This will start up a flask app with a UI for asking AI models questions on [port 5000](localhost://5000). The application supports two models: [SmolLM3-3B](https://huggingface.co/HuggingFaceTB/SmolLM3-3B) for fast local inference and [gpt-oss-20b](https://cookbook.openai.com/articles/gpt-oss/run-locally-ollama) via Ollama for more powerful responses. You can select between models using the dropdown in the interface. The first time you use each model, there will be some initial setup time for downloading and caching.

![Temporal UI](images/Temporal.png)

You're able to ask as many questions as you'd like and can navigate to the temporal UI running on [port 8233](localhost://8233) to view the status of the queue. You can navigate to a specific task queue by clicking on the question from our flask UI. From the temporal UI, you can restart, terminate or just view the status of any specific workflow.
