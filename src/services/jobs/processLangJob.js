import cld from 'cld-sync';
import moment from 'moment';

import Repo from '../../models/Repo';
import logger from '../../logger';

const PER_PAGE = 10000;

const queryNumReposToUpdate = async () => Repo.count({});

const queryRepos = async ({ prevLastDate }) =>
  !prevLastDate
    ? Repo.find({})
        .limit(PER_PAGE)
        .sort({ _id: 1 })
    : Repo.find({ createdAt: { $gt: prevLastDate } })
        .limit(PER_PAGE)
        .sort({ _id: 1 });

const processSingleRepo = async repo => {
  const { _id, description } = repo;

  // Exit if no description
  if (!description) {
    return Promise.resolve();
  }

  const result = cld.detect(description).result;

  // Skip for unknown result
  if (!result) {
    return Promise.resolve();
  }

  const isReliable = result.reliable;
  const { name, code, percent } = result.languages[0];

  // Skip if prediction unreliable
  if (!isReliable) {
    Promise.resolve();
  }

  // Update the native lang
  return Repo.findByIdAndUpdate(_id, { nativeLang: name }, { upsert: true });
  //   return Promise.resolve();
};

const processRepos = async repos => {
  const promises = repos.map(r => processSingleRepo(r));
  return Promise.all(promises);
};

const processLangJob = () => {
  (async () => {
    try {
      let prevLastDate = null;
      let currPage = 0;
      const start = moment();

      const numRepos = await queryNumReposToUpdate();
      logger.info(`Processing repo native lang, totalNumPages=${numRepos / PER_PAGE}`);

      while (true) {
        const hoursPassed = moment().diff(start, 'hours');
        logger.info(
          `Processing repo native lang, currPage=${currPage} hoursPassed=${hoursPassed} prevLastDate=${prevLastDate}`
        );
        const repos = await queryRepos({ prevLastDate });

        // Return if no repos left
        if (repos.length === 0) {
          break;
        }

        // Process all repos
        await processRepos(repos);

        // Increment counters
        prevLastDate = repos[repos.length - 1].createdAt;
        currPage++;
      }

      logger.info('Done processing repo languages.');
    } catch (e) {
      logger.error(e.message);
    }
  })();
};

export default processLangJob;
