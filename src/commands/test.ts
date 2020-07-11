import { Command, ProgressBar } from '../deps.ts'

export const test = new Command()
  .description("Publishes the current directory to the nest.land registry.")
  .action(async () => {

    const
      title = 'Publishing',
      total = 100,
      progress = new ProgressBar({ title, total })

    let completed = 0

    function downloading() {

      if (completed <= total) {

        progress.render(completed++)
        setTimeout(() => {

          downloading()

        }, 100)

      }

    }

    downloading()

  })