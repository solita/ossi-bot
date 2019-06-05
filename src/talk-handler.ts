'use strict';

module.exports.talk = (event: any) => {
    console.log(event);
    const body = JSON.parse(event.body);
    if(body.challenge) {
      return Promise.resolve(
          {
              statusCode: 200,
              body: JSON.stringify({challenge: body.challenge})
          });
    }


    return Promise.resolve({
        statusCode: 200
    });
};
