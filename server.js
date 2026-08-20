require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/* ================================
   STORE CHAT RESPONSES
================================ */

const pendingResponses = new Map();


/* ================================
   SEND MESSAGE TO DEVREV AGENT
================================ */

app.post("/api/chat", async (req, res) => {

  try {

    const message = req.body.message;
    const sessionId =
      req.body.sessionId ||
      crypto.randomUUID();

    if (!message) {

      return res.status(400).json({
        error: "Message is required"
      });

    }


    const response = await fetch(
      "https://api.devrev.ai/internal/ai-agents.events.execute-async",
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization":
            `Bearer ${process.env.DEVREV_API_KEY}`
        },

        body: JSON.stringify({

          agent:
            process.env.DEVREV_AGENT_ID,

          event: {

            input_message: {

              message: message

            }

          },


          // Keeps conversation memory
          session_object:
            sessionId,


          webhook_target: {

            webhook:
              process.env.DEVREV_WEBHOOK_ID

          },


          client_metadata: {

            session_id:
              sessionId

          }

        })

      }
    );


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "DevRev error:",
        data
      );

      return res.status(500).json({
        error:
          "Failed to send message to DevRev",
        details: data
      });

    }


    res.json({

      success: true,

      sessionId:
        sessionId

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({

      error:
        "Server error"

    });

  }

});


/* ================================
   RECEIVE DEVREV WEBHOOK RESPONSE
================================ */

app.post(
  "/api/devrev-webhook",
  function (req, res) {

    console.log(
      "DevRev webhook:",
      JSON.stringify(
        req.body,
        null,
        2
      )
    );

    try {

      const payload =
        req.body.payload;

      if (
        payload &&
        payload.ai_agent_response
      ) {

        const agentResponse =
          payload.ai_agent_response;

        const sessionId =
          agentResponse
            .client_metadata
            ?.session_id;

        const message =
          agentResponse.message;

        if (
          sessionId &&
          message
        ) {

          pendingResponses.set(
            sessionId,
            {

              message:
                message,

              timestamp:
                Date.now()

            }
          );

        }

      }

    } catch (error) {

      console.error(
        "Webhook processing error:",
        error
      );

    }


    res.status(200).send("OK");

  }
);


/* ================================
   FRONTEND CHECKS FOR RESPONSE
================================ */

app.get(
  "/api/chat-response/:sessionId",
  function (req, res) {

    const sessionId =
      req.params.sessionId;

    const response =
      pendingResponses.get(
        sessionId
      );

    if (!response) {

      return res.json({

        ready: false

      });

    }


    pendingResponses.delete(
      sessionId
    );


    res.json({

      ready: true,

      message:
        response.message

    });

  }
);


/* ================================
   START SERVER
================================ */

app.listen(
  process.env.PORT || 3000,
  function () {

    console.log(
      "Server running at http://localhost:3000"
    );

  }
);