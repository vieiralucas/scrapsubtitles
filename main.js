const fs = require('fs');
const _ = require('lodash');
const Bluebird = require('bluebird');
const OS = require('opensubtitles-api');
const series = require('./series.json');

const OpenSubtitles = new OS({
  useragent: 'OSTestUserAgent',
  ssl: true
});

let founded = 0;

const log = msg => {
  console.log(`Founded: ${founded}`);
  console.log(`Status: ${msg}`);
  console.log('-------------------------');
};

Bluebird.map(series, findUntilTheEnd)
  .then(result => {
    fs.writeFileSync('output.json', JSON.stringify(result, null, 2));
    console.log('Finished with success');
    console.log(`${series.length} series were searched`);
    console.log(`For an total of ${_.flatten(result).length} subtitles`);
    console.log('The download links can be found at output.json');
  })
  .catch(err => {
    console.error(`Unexpected error ocurried: ${err.message}`);
  });

function findUntilTheEnd(name) {
  const iter = (season, episode, urls) => {
    return findSubtitle(name, season, episode)
      .then(url => {
        urls.push({
          name: name,
          season: season,
          episode: episode,
          url: url
        });

        episode++;
        return iter(season, episode, urls);
      })
      .catch(err => {
        if (episode === 1 || err.message !== 'subtitle not found') {
          return urls;
        }

        season++;
        episode = 1;
        return iter(season, episode, urls);
      });
  };

  return iter(1, 1, []);
}
function findSubtitle(name, season, episode) {
  log(`Looking for ${name} S${season}E${episode}`);
  const opts = {
    sublanguageid: 'eng',
    query: name,
    season: season + '',
    episode: episode + ''
  };

  return OpenSubtitles.search(opts)
    .catch(err => {
      console.info(`Unexpected error ocuried: ${err}`);
      return Bluebird.reject(err);
    })
    .then(r => {
      const url = _.get(r, 'en.url');

      if (!url) {
        log(`${name} S${season}E${episode} not found`);
        return Bluebird.reject(new Error('subtitle not found'));
      }

      founded++;
      log(`Found ${name} S${season}E${episode}`);
      return url;
    });
}
