// módulos requeridos
require('dotenv/config'); // necesitamos un archivo de nombre .env que contenga TOKEN y OPENAI_KEY
const { Client } = require('discord.js');
const { OpenAI } = require('openai');

const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
});

client.on('ready', () => {
    console.log('El bot está online'); // mensaje para indicar que el bot está conectado
});

const IGNORE_PREFIX = '!'; // ignora mensajes que comiencen con lo que esté acá
const CHANNELS = ['1157158392398360709', '1157317110633078878']; // channelID de Discord donde el bot interactuará

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
})

client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // si el autor del mensaje es un bot, no hacer nada
    if (message.content.startsWith(IGNORE_PREFIX)) return; // si el contenido comienza con el prefijo prohibido, no hacer nada
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return; // si no nos encontramos en el canal permitido y el mensaje no menciona a nuestro bot, no hacer nada

    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    let conversation = [];
    conversation.push({
        role: 'system',
        content: 'Tu nombre es Glacia, eres una consultora de negocios trabajando para RTM Consulting. Tu área de expertise es Planeamiento Estratégico. Eres amable, graciosa y un poco sarcástica.' // prompt general del bot, esto le da la personalidad y el foco
    });

    let prevMessages = await message.channel.messages.fetch({ limit: 100 }); // El máximo de mensajes que leerá será 100 (por API de Discord)
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return; // ignorar mensajes de bots que no sean nuestro bot
        if (msg.content.startsWith(IGNORE_PREFIX)) return; // ignorar mensajes con el prefijo prohibido

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, ''); // transformar el username de quien usa el bot a lo que OpenAI acepta como username

        // respuestas del bot
        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content,
            });

            return;
        }

        // prompts del usuario
        conversation.push({
            role: 'user',
            name: username,
            content: msg.content,
        });

    })

    // especificamos el modelo que usamos
    const response = await openai.chat.completions
        .create({
            model: 'gpt-3.5-turbo-0301',
            messages: conversation,
        })
        .catch((error) => console.error('Error de OpenAI:\n', error));

    clearInterval(sendTypingInterval);
    
    // que el bot responda en Discord en caso no haya respuesta de OpenAI
    //if (!response) {
    //    message.reply('Estoy teniendo problemas con la API de OpenAI. Intenta nuevamente pronto.');
    //    return;
    //}

    // el límite de caracteres por mensaje para un bot en Discord es de 2K, para respuestas más largas partimos el contenido en partes de 2K antes de enviarlo a Discord
    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    
     for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);
    
        await message.channel.send(chunk);
    }

});

client.login(process.env.TOKEN);