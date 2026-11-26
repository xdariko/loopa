require "rails_helper"

RSpec.describe CopyProject do
  let(:source) { Project.create!(title: "Loop", data: { version: 1, bpm: 120 }) }
  let(:copy) { described_class.call(source) }

  it "keeps the source document when the copy is edited" do
    copy.update!(title: "Remix", data: { version: 1, bpm: 140 })

    expect(source.reload).to have_attributes(title: "Loop", data: { "version" => 1, "bpm" => 120 })
  end

  it "assigns a different share token to the copy" do
    expect(copy.share_token).not_to eq(source.share_token)
  end
end
