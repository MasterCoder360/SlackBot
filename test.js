const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});


app.command('/game', async ({ command, ack, respond }) => {
  await ack();

  const gameUrl = command.text.trim();

  if (!gameUrl || !gameUrl.startsWith('http')) {
    await respond({
      text: " Please provide a valid game link! Usage: `/game https://example.com`",
      response_type: "ephemeral"
    });
    return;
  }

  await respond({
    response_type: "in_channel",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ` *Interactive Game Session Launched!* \nAn external game canvas is available. Shared by <@${command.user_id}>.`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔗 *Target URL:* <${gameUrl}|${gameUrl}>`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "🕹️ Launch & Play Game", emoji: true },
            style: "primary",
            url: gameUrl,
            action_id: "open_game_browser"
          },
          {
            type: "button",
            text: { type: "plain_text", text: "🏆 Record Winner", emoji: true },
            action_id: "trigger_winner_modal",
            value: command.channel_id 
          }
        ]
      }
    ]
  });
});

app.action('trigger_winner_modal', async ({ ack, body, client }) => {
  await ack();

  try {
    await client.views.open({
      trigger_id: body.trigger_id, 
      view: {
        type: 'modal',
        callback_id: 'submit_winner_form', 
        private_metadata: body.actions[0].value, 
        title: { type: 'plain_text', text: 'Match Results' },
        submit: { type: 'plain_text', text: 'Submit Results' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'winner_select_block',
            element: {
              type: 'users_select', 
              placeholder: { type: 'plain_text', text: 'Select the champion...' },
              action_id: 'chosen_winner'
            },
            label: { type: 'plain_text', text: ' Who won the game?' }
          },
          {
            type: 'input',
            block_id: 'score_input_block',
            optional: true,
            element: {
              type: 'plain_text_input',
              placeholder: { type: 'plain_text', text: 'e.g., 2500 pts, 3-2 victory...' },
              action_id: 'score_details'
            },
            label: { type: 'plain_text', text: ' Final Score / Notes' }
          }
        ]
      }
    });
  } catch (error) {
    console.error(' Failed to open winner modal:', error);
  }
});

app.view('submit_winner_form', async ({ ack, body, view, client }) => {
  await ack();

  const winnerId = view.state.values.winner_select_block.chosen_winner.selected_user;
  const scoreNotes = view.state.values.score_input_block.score_details.value || 'No notes added.';
  
  const targetChannelId = view.private_metadata;
  const submitterId = body.user.id;

  try {
    await client.chat.postMessage({
      channel: targetChannelId,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: ` *MATCH RESULTS ARE IN!* \n\n Congratulations to <@${winnerId}> for dominating the battlefield!`
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: ` *Winner:* <@${winnerId}>` },
            { type: "mrkdwn", text: ` *Logged By:* <@${submitterId}>` },
            { type: "mrkdwn", text: ` *Match Details:* \n_${scoreNotes}_` }
          ]
        }
      ]
    });
  } catch (error) {
    console.error(' Failed to post match results:', error);
  }
});

app.action('open_game_browser', async ({ ack }) => { await ack(); });

(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log(` Slack bot modal utility is online!`);
  } catch (error) {
    console.error(" App startup crash:", error);
  }
})();
