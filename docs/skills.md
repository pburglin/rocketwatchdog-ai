# Skills Gateway Requirements

RocketWatchDog.ai must act as a gateway for skill installation and downloads.

## Requirements

- Scan skills for security and risk issues before agents install them.
- Enforce a risk threshold and block skills that exceed it.
- Provide machine-readable decision outputs and reason codes.
- Integrate skill scanning into the policy/guard pipeline.
- Support a “pre-install” scan endpoint that can be called by RocketClaw or other agents.
- Allow a platform-configured max risk score (platform.skills.max_risk_score) as the default threshold.
- Surface the threshold used in the scan response.
