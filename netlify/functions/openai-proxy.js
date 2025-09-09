const axios = require('axios');

exports.handler = async function(event, context) {
  // Gestisci le richieste preflight OPTIONS per CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: 'Method Not Allowed' 
    };
  }

  try {
    const { analysisResults, userMessage } = JSON.parse(event.body);
    
    // Prepara il contesto per OpenAI basato sui risultati dell'analisi
    let analysisContext = "Sei un esperto di corrosione e protezione dei materiali. L'utente ha caricato un'immagine analizzata per la corrosione. ";
    
    if (analysisResults && analysisResults.data) {
      const result = Array.isArray(analysisResults.data) ? analysisResults.data[0] : analysisResults.data;
      
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
          content: analysisContext + " Fornisci consigli utili e pratici in italiano."
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
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        response: response.data.choices[0].message.content 
      })
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to get response from AI' })
    };
  }
};
