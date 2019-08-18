import LanguageDetect from 'languagedetect';
import cld from 'cld-sync';

import Repo from '../../models/Repo';
import logger from '../../logger';

const PER_PAGE = 10000;

const langDetector = new LanguageDetect();

const queryRepos = async ({ page = 1 }) => {
  const pagination = {
    limit: PER_PAGE,
    skip: PER_PAGE * (page - 1)
  };

  return Repo.find({ nativeLang: { $exists: false } })
    .limit(pagination.limit)
    .skip(pagination.skip)
    .exec();
};

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

  //   if (code !== 'en') {
  //     console.log(`${name}/${percent} -- ${description} -- ${isReliable}`);
  //   }

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
      let page = 1;

      while (true) {
        console.log(`mining page ${page}`);
        const repos = await queryRepos({ page });

        // Return if no repos left
        if (repos.length === 0) {
          break;
        }

        // Process all repos
        await processRepos(repos);

        // Increment page
        page++;
      }
    } catch (e) {
      logger.error(e.message);
    }
  })();
};

export default processLangJob;
