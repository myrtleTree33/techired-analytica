import _ from 'lodash';
import moment from 'moment';

import logger from '../../logger';

import Profile from '../../models/Profile';
import Repo from '../../models/Repo';

const PER_PAGE = 1000;

const queryProfiles = async ({ page }) => {
  const pagination = {
    limit: PER_PAGE,
    skip: PER_PAGE * (page - 1)
  };

  return Profile.find({ userLangs: { $exists: false } })
    .limit(pagination.limit)
    .skip(pagination.skip)
    .exec();
};

const queryRepos = async ({ repoIds }) => {
  let repos = await Repo.find({
    repoId: { $in: repoIds }
  });

  if (!repos) {
    return Promise.resolve([]);
  }

  repos = repos.filter(r => !!r.nativeLang);
  return Promise.resolve(repos);
};

const upsertProfileLangs = async profile => {
  const { _id, login, ownedRepoIds } = profile;

  const repos = await queryRepos({ repoIds: ownedRepoIds });

  let userLangs = repos.filter(r => !!r.nativeLang).map(r => r.nativeLang);
  userLangs = _.uniq(userLangs);

  return Profile.findByIdAndUpdate(_id, { userLangs }, { upsert: true });
};

const processUserLangsJob = () => {
  (async () => {
    const start = moment();

    try {
      let page = 1;

      const numUsers = await Profile.count({});

      logger.info(
        `Processing user native languages, numUsers=${numUsers} i.e. numPages=${numUsers /
          PER_PAGE}`
      );

      while (true) {
        const hoursPassed = moment().diff(start, 'hours');
        logger.info(
          `Updating user languages - processing page ${page}.  ${hoursPassed} hours have passed.`
        );
        const profiles = await queryProfiles({ page });

        if (profiles.length === 0) {
          break;
        }

        await Promise.all(profiles.map(u => upsertProfileLangs(u)));

        // Increment page
        page++;
      }
    } catch (e) {
      logger.error(e.message);
    }
  })();
};

export default processUserLangsJob;
