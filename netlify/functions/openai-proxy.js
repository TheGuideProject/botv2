const axios = require('axios');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { analysisResults, userMessage } = JSON.parse(event.body);
    
    // Prepara il contesto per OpenAI basato sui risultati dell'analisi
    let analysisContext = "L'utente ha caricato un'immagine analizzata per la corrosione. ";
    
    if (analysisResults && analysisResults.data && analysisResults.data[0]) {
      const result = analysisResults.data[0];
      
      if (result.confidences) {
        analysisContext += "I risultati dell'analisi mostrano: ";
        result.confidences.forEach(item => {
          analysisContext += `${item.label}: ${(item.confidence * 100).toFixed(2)}% di confidenza. `;
        });
      } else if (result.label) {
        analysisContext += `L'immagine è stata classificata come: ${result.label}.`;
      }
    }

    // Chiama l'API di OpenAI
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Sei un esperto di corrosione e protezione dei materiali. ${analysisContext} Fornisci consigli utili e pratici.`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        response: response.data.choices[0].message.content 
      })
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get response from AI' })
    };
  }
};