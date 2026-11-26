require "rails_helper"

RSpec.describe "Samples and sharing API", type: :request do
  include ActiveJob::TestHelper

  let(:project) { register_project_owner.projects.create!(title: "Loop", data: { version: 1 }) }

  it "uploads a WAV and serves it through the project responses" do
    post "/api/projects/#{project.id}/samples", params: { file: wav_upload }, headers: RequestHelpers::BROWSER_WRITE_HEADERS

    expect(response).to have_http_status(:created)
    sample = response.parsed_body
    expect(project.samples.blobs.first.download).to eq(wav_bytes)

    get "/api/projects/#{project.id}"
    expect(response).to have_http_status(:success)
    expect(response.parsed_body["samples"]).to eq([sample])

    get sample.fetch("url")
    expect(response).to have_http_status(:redirect)
    follow_redirect!
    expect(response).to have_http_status(:success)
    expect(response.body.b).to eq(wav_bytes)
  end

  it "accepts MP3 content independently of the browser content type" do
    mp3 = "\xFF\xFB\x90\x64".b + ("\0" * 413)
    post "/api/projects/#{project.id}/samples",
      params: { file: upload(mp3, "application/octet-stream", "beat.mp3") }, headers: RequestHelpers::BROWSER_WRITE_HEADERS

    expect(response).to have_http_status(:created)
    expect(project.samples.blobs.first.content_type).to eq("audio/mpeg")
  end

  it "rejects a fake WAV" do
    post "/api/projects/#{project.id}/samples",
      params: { file: upload("fake wave", "audio/wav", "fake.wav") }, headers: RequestHelpers::BROWSER_WRITE_HEADERS
    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body.dig("errors", "samples")).to include("must be WAV or MP3")
    expect(project.samples).not_to be_attached
  end

  it "rejects an oversized sample" do
    post "/api/projects/#{project.id}/samples",
      params: { file: upload("a" * (5.megabytes + 1), "audio/mpeg", "large.mp3") }, headers: RequestHelpers::BROWSER_WRITE_HEADERS
    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body.dig("errors", "samples")).to include("must be 5 MB or smaller")
    expect(project.samples).not_to be_attached
  end

  it "opens a public project by token without exposing its internal id" do
    get "/api/shared/#{project.share_token}"

    expect(response).to have_http_status(:success)
    expect(response.parsed_body.keys.sort).to eq(%w[data samples title])
    expect(response.parsed_body["title"]).to eq("Loop")
  end

  it "returns not found for an unknown share token" do
    get "/api/shared/unknown"
    expect(response).to have_http_status(:not_found)
  end

  it "copies a shared project with sound that stays available after deleting the source" do
    post "/api/projects/#{project.id}/samples", params: { file: wav_upload }, headers: RequestHelpers::BROWSER_WRITE_HEADERS
    sample = response.parsed_body
    document = { version: 1, tracks: [{ instrument: { kind: "sample", sampleId: sample.fetch("id") } }] }
    project.update!(data: document)
    token = project.share_token

    post "/api/shared/#{token}/copy", headers: RequestHelpers::BROWSER_WRITE_HEADERS
    expect(response).to have_http_status(:created)
    copied = response.parsed_body
    expect(copied["id"]).not_to eq(project.id)
    expect(copied["share_token"]).not_to eq(token)
    expect(copied["data"]).to eq(document.deep_stringify_keys)
    expect(copied["samples"]).to eq([sample])

    perform_enqueued_jobs do
      delete "/api/projects/#{project.id}", headers: RequestHelpers::BROWSER_WRITE_HEADERS
    end
    expect(response).to have_http_status(:no_content)

    get "/api/projects/#{copied["id"]}"
    expect(response).to have_http_status(:success)
    expect(response.parsed_body["samples"]).to eq([sample])
    expect(Project.find(copied["id"]).samples.blobs.first.download).to eq(wav_bytes)
  end

  private

  def wav_bytes
    "RIFF".b + [38].pack("V") + "WAVEfmt ".b +
      [16, 1, 1, 8_000, 16_000, 2, 16].pack("VvvVVvv") + "data".b + [2, 0].pack("Vv")
  end

  def upload(bytes, content_type, name)
    Rack::Test::UploadedFile.new(StringIO.new(bytes.dup), content_type, true, original_filename: name)
  end

  def wav_upload
    upload(wav_bytes, "audio/wav", "kick.wav")
  end
end
