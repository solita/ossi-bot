var stdin = process.stdin,
    stdout = process.stdout,
    inputChunks = [];

stdin.resume();
stdin.setEncoding('utf8');

stdin.on('data', function (chunk) {
    inputChunks.push(chunk);
});

stdin.on('end', function () {
    var inputJSON = inputChunks.join(),
        parsedData = JSON.parse(inputJSON).Items.sort((a, b) => parseInt(a.timestamp.N) - parseInt(b.timestamp.N));;

    const items = parsedData.map(entry => {
      return {
        timestamp: entry.timestamp.N,
        name: entry.username.S,
        date: new Date(parseInt(entry.timestamp.N)),
        text: entry.text.S,
        status: entry.status.S,
        size: entry.size.S
      };
    });

    items.forEach(item => {
      console.log(item.size);
      console.log(item.date);
      console.log(item.name);
      console.log(item.text);
      console.log();
    });

});
